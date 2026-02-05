"""
LoRA model inference
"""
import time
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

from .config import (
    BASE_MODEL,
    ADAPTERS_DIR,
    MAX_NEW_TOKENS,
    SYSTEM_PROMPT,
)

# Global state
tokenizer = None
base_model = None
models: dict = {}


def init_tokenizer():
    """Initialize tokenizer."""
    global tokenizer
    # Use slow tokenizer to avoid tokenizer.json parsing issues
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL,
        use_fast=False,
        trust_remote_code=True
    )


def init_base_model():
    """Initialize base model in fp16."""
    global base_model

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
        attn_implementation="eager",
    )


def load_adapter(subject: str, adapter_name: str) -> bool:
    """Load LoRA adapter for a subject."""
    global base_model
    adapter_path = ADAPTERS_DIR / adapter_name

    if not adapter_path.exists():
        print(f"  Warning: adapter not found at {adapter_path}")
        models[subject] = base_model  # fallback
        return False

    models[subject] = PeftModel.from_pretrained(base_model, str(adapter_path))
    models[subject].eval()
    return True


def _build_messages(question: str, history: list[dict], context: str) -> list[dict]:
    """Build chat messages for the model."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if context.strip():
        messages.append({
            "role": "system",
            "content": f"Course materials:\n{context}"
        })

    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": question})
    return messages


def generate_response(
    subject: str,
    question: str,
    history: list[dict],
    context: str,
) -> str:
    """Generate response using LoRA model."""
    model = models.get(subject)
    if not model:
        raise ValueError(f"Model for subject '{subject}' not loaded")

    messages = _build_messages(question, history, context)
    start_time = time.time()

    # Tokenize
    input_ids = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    ).to(model.device)

    # Generate (greedy decoding - faster than sampling at low temperature)
    with torch.inference_mode():
        output = model.generate(
            input_ids=input_ids,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode
    response = tokenizer.decode(
        output[0][input_ids.shape[1]:],
        skip_special_tokens=True,
    )
    # Remove Phi model end tokens
    response = response.replace("<|end|>", "").replace("<|endoftext|>", "").strip()

    elapsed = time.time() - start_time
    print(f"[Inference] {subject}: {elapsed:.2f}s")

    return response


def get_loaded_subjects() -> list[str]:
    """Return list of loaded subject keys."""
    return list(models.keys())


def generate_response_stream(
    subject: str,
    question: str,
    history: list[dict],
    context: str,
):
    """Generate response with streaming (yields tokens as they are generated)."""
    from transformers import TextIteratorStreamer
    from threading import Thread

    model = models.get(subject)
    if not model:
        raise ValueError(f"Model for subject '{subject}' not loaded")

    messages = _build_messages(question, history, context)

    # Tokenize
    input_ids = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    ).to(model.device)

    # Setup streamer
    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True,
    )

    # Generate in background thread
    generation_kwargs = {
        "input_ids": input_ids,
        "max_new_tokens": MAX_NEW_TOKENS,
        "do_sample": False,
        "pad_token_id": tokenizer.eos_token_id,
        "streamer": streamer,
    }

    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    # Yield tokens as they come (filter out end tokens)
    for token in streamer:
        cleaned = token.replace("<|end|>", "").replace("<|endoftext|>", "")
        if cleaned:
            yield cleaned

    thread.join()

"""
LoRA model inference
"""
import time
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

from .config import (
    BASE_MODEL,
    ADAPTERS_DIR,
    MAX_NEW_TOKENS,
    REPETITION_PENALTY,
    LOAD_IN_4BIT,
    SYSTEM_PROMPT,
)

# Stop markers to strip from generated output
STOP_MARKERS = ["<|im_end|>", "<|im_start|>", "<reponame>", "<gh_stars>"]

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
    """Initialize base model (4-bit quantized if available, else fp16)."""
    global base_model

    load_kwargs = {
        "device_map": "auto",
        "trust_remote_code": True,
        "attn_implementation": "eager",
    }

    if LOAD_IN_4BIT:
        try:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
            )
            load_kwargs["quantization_config"] = bnb_config
            print("[Inference] Loading model with 4-bit quantization")
        except Exception as e:
            print(f"[Inference] 4-bit quantization unavailable ({e}), falling back to fp16")
            load_kwargs["torch_dtype"] = torch.float16
    else:
        load_kwargs["torch_dtype"] = torch.float16

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        **load_kwargs,
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


def _clean_response(text: str) -> str:
    """Strip stop markers and Phi end tokens from generated text."""
    text = text.replace("<|end|>", "").replace("<|endoftext|>", "")
    for marker in STOP_MARKERS:
        if marker in text:
            text = text[:text.index(marker)]
    return text.strip()


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
            repetition_penalty=REPETITION_PENALTY,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode and clean
    response = tokenizer.decode(
        output[0][input_ids.shape[1]:],
        skip_special_tokens=True,
    )
    response = _clean_response(response)

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
        "repetition_penalty": REPETITION_PENALTY,
        "pad_token_id": tokenizer.eos_token_id,
        "streamer": streamer,
    }

    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    # Yield tokens as they come (filter out end/stop tokens)
    accumulated = ""
    stop_hit = False
    for token in streamer:
        if stop_hit:
            continue
        accumulated += token
        # Check if any stop marker has appeared in accumulated text
        for marker in STOP_MARKERS + ["<|end|>", "<|endoftext|>"]:
            if marker in accumulated:
                # Yield everything before the marker, then stop
                before = accumulated[:accumulated.index(marker)]
                if before:
                    yield before
                stop_hit = True
                break
        else:
            # No marker found — yield the token
            cleaned = token.replace("<|end|>", "").replace("<|endoftext|>", "")
            if cleaned:
                yield cleaned

    thread.join()

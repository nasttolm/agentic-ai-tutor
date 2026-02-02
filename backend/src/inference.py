"""
LoRA model inference
"""
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

from .config import (
    BASE_MODEL,
    ADAPTERS_DIR,
    MAX_NEW_TOKENS,
    TEMPERATURE,
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
    """Initialize base model in float16 (no quantization)."""
    global base_model

    # Load model in float16 without quantization
    # Phi-4-mini is ~9GB in fp16, fits in 12GB VRAM
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
        attn_implementation="eager",  # Use eager attention (no flash_attn required)
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

    # Build messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add context if available
    if context.strip():
        messages.append({
            "role": "system",
            "content": f"Course materials:\n{context}"
        })

    # Add history (last 10 messages)
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current question
    messages.append({"role": "user", "content": question})

    # Tokenize
    input_ids = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    ).to(model.device)

    # Generate
    with torch.inference_mode():
        output = model.generate(
            input_ids=input_ids,
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=TEMPERATURE,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode
    response = tokenizer.decode(
        output[0][input_ids.shape[1]:],
        skip_special_tokens=True,
    )
    return response.strip()


def get_loaded_subjects() -> list[str]:
    """Return list of loaded subject keys."""
    return list(models.keys())

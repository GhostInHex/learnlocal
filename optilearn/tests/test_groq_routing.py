import asyncio
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Keep this routing test runnable in the lightweight local test environment.
if "loguru" not in sys.modules:
    loguru = types.ModuleType("loguru")
    loguru.logger = MagicMock()
    sys.modules["loguru"] = loguru

# The test covers routing only, so it does not need the full settings package.
config = types.ModuleType("app.core.config")
config.settings = types.SimpleNamespace(
    DB_PATH="./data/test.db",
    USE_LOCAL_OLLAMA=False,
    GEMMA_API_KEY="",
    GEMMA_26B_API_KEY="",
    GEMMA_26B_MODEL="gemma-test",
    GEMMA_26B_BASE_URL="https://example.com",
    GROQ_API_KEY="",
    GROQ_MODEL="llama-3.3-70b-versatile",
    OLLAMA_HOST="http://localhost:11434",
    OLLAMA_MODEL_FAST="local-fast",
    OLLAMA_MODEL_DEEP="local-deep",
    OLLAMA_TUTOR_MODEL="local-tutor",
)
sys.modules["app.core.config"] = config

from app.services import model_client as module


def test_groq_key_marks_auto_mode_as_cloud(monkeypatch):
    """A Groq-only hosted deployment must not be routed to local Ollama."""
    monkeypatch.setattr(module.settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(module.settings, "GEMMA_26B_API_KEY", "")
    monkeypatch.setattr(module, "_is_force_offline", lambda: False)

    async def measured_latency():
        return 25

    monkeypatch.setattr(module, "_measure_network_latency", measured_latency)

    status = asyncio.run(module.check_network_status())

    assert status == {
        "connected": True,
        "latency_ms": 25,
        "use_26b": True,
        "cloud_provider": "groq",
    }


def test_text_generation_uses_groq_when_it_is_the_cloud_provider(monkeypatch):
    async def cloud_status():
        return {"connected": True, "latency_ms": 25, "use_26b": True, "cloud_provider": "groq"}

    captured = {}

    async def groq_stream(messages, options, **kwargs):
        captured["messages"] = messages
        captured["kwargs"] = kwargs
        yield "online reply"

    monkeypatch.setattr(module, "get_network_status", cloud_status)
    monkeypatch.setattr(module.model_client, "_groq_stream", groq_stream)

    async def collect_reply():
        return [token async for token in module.route_generate(
            "Explain fractions",
            module.ROUTE_ADMIN,
            system_prompt="Teach clearly.",
            profile="admin_balanced",
        )]

    reply = asyncio.run(collect_reply())

    assert reply == ["online reply"]
    assert captured["messages"] == [
        {"role": "system", "content": "Teach clearly."},
        {"role": "user", "content": "Explain fractions"},
    ]
    assert captured["kwargs"]["route_type"] == module.ROUTE_ADMIN

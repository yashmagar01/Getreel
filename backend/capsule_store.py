import uuid
import json
from typing import Optional

_capsules: dict[str, dict] = {}

def create_capsule(data: dict) -> str:
    capsule_id = str(uuid.uuid4())
    _capsules[capsule_id] = data
    return capsule_id

def get_capsule(capsule_id: str) -> Optional[dict]:
    return _capsules.get(capsule_id)

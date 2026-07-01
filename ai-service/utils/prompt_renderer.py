from pathlib import Path
from typing import Any, Dict
import json


class PromptRenderer:
    def __init__(self, template_path: str | Path) -> None:
        self.template_path = Path(template_path)

    def render(self, context: Dict[str, Any]) -> str:
        if not self.template_path.exists():
            raise FileNotFoundError(f"Prompt template not found: {self.template_path}")

        template = self.template_path.read_text(encoding="utf-8")
        data_json = json.dumps(context.get("data", {}), ensure_ascii=False, indent=2)
        return template.replace("{data_json}", data_json)

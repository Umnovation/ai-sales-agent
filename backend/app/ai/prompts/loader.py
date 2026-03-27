"""XML prompt loader.

Loads prompt templates from XML files and renders them with variables.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

_PROMPTS_DIR: Path = Path(__file__).parent


def load_prompt(name: str, variables: dict[str, str] | None = None) -> str:
    """Load an XML prompt template and substitute variables.

    Args:
        name: Prompt filename without extension (e.g., "generate_response").
        variables: Key-value pairs to substitute in the template.
            Placeholders use {{key}} syntax.

    Returns:
        Rendered prompt string.
    """
    file_path: Path = _PROMPTS_DIR / f"{name}.xml"
    if not file_path.exists():
        msg: str = f"Prompt template not found: {file_path}"
        raise FileNotFoundError(msg)

    tree: ET.ElementTree = ET.parse(file_path)
    root: ET.Element = tree.getroot()

    parts: list[str] = []
    for section in root:
        tag: str = section.tag
        text: str = (section.text or "").strip()
        if text:
            parts.append(f"## {tag.replace('_', ' ').title()}\n\n{text}")

    prompt: str = "\n\n".join(parts)

    if variables:
        for key, value in variables.items():
            prompt = prompt.replace(f"{{{{{key}}}}}", value)

    return prompt

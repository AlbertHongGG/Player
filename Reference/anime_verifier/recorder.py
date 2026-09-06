"""Execution log recorder for persisting verification runs to JSON files."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from anime_verifier.models import ExecutionRunRecord

logger = logging.getLogger(__name__)


def generate_verifier_filename(timestamp: datetime | None = None) -> str:
    """Generates filename conforming strictly to yyyymmdd_hhmmss_verifier.json."""
    ts = timestamp or datetime.now()
    return ts.strftime("%Y%m%d_%H%M%S_verifier.json")


class ExecutionRecorder:
    """Manages saving and loading of verification execution run records."""

    def __init__(self, output_dir: Path | str = "output") -> None:
        self.output_dir = Path(output_dir)

    def save_run_record(
        self,
        record: ExecutionRunRecord,
        filename: str | None = None,
    ) -> Path:
        """Persists the execution record as a pretty-printed UTF-8 JSON file.

        Args:
            record: ExecutionRunRecord containing metadata and articles.
            filename: Optional custom filename; defaults to yyyymmdd_hhmmss_verifier.json.

        Returns:
            The absolute Path of the saved JSON file.
        """
        self.output_dir.mkdir(parents=True, exist_ok=True)

        if not filename:
            filename = generate_verifier_filename(record.metadata.execution_timestamp)

        file_path = self.output_dir / filename

        # Dump using Pydantic mode='json' so all nested models (including ApiRequestPayload)
        # become native Python dicts/lists without string escaping.
        record_dict = record.model_dump(mode="json")

        json_str = json.dumps(record_dict, indent=2, ensure_ascii=False)
        file_path.write_text(json_str, encoding="utf-8")

        logger.info(f"Execution record saved to: {file_path.resolve()}")
        return file_path.resolve()

    def list_records(self) -> list[Path]:
        """Lists all existing verification JSON records in the output directory."""
        if not self.output_dir.exists():
            return []
        return sorted(self.output_dir.glob("*_verifier.json"), reverse=True)

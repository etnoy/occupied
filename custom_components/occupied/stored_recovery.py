"""Preserve invalid GUI input for repair without treating it as a live program."""

import hashlib
import json

import yaml


def stored_program_recovery(source, issues):
    """Run serialization in HA's executor alongside validation."""
    return {
        "yaml": source
        if isinstance(source, str)
        else yaml.safe_dump(source, sort_keys=False, allow_unicode=True),
        "revision": "invalid:"
        + hashlib.sha256(json.dumps(source, sort_keys=True).encode()).hexdigest(),
        "issues": [issue.to_dict() for issue in issues],
    }

"""Pure time and program fixtures without Home Assistant test plugins."""

import pytest
from freezegun import freeze_time


@pytest.fixture
def freezer():
    with freeze_time() as frozen:
        yield frozen

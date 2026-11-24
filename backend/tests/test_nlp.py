from app.database import get_db
from app.expert_system import knowledge_base, nlp


def _catalog():
    return knowledge_base.get_appliance_catalog()


def test_extract_example_sentence():
    ext = nlp.extract_requirements(
        "I have a two-bedroom house with 4 fans, 8 LED lights, one refrigerator, one LED TV "
        "and a washing machine. I need backup for around 8 hours.",
        _catalog(),
    )
    names = {a["name"]: a["quantity"] for a in ext["appliances"]}
    assert names["Ceiling fan"] == 4
    assert names["LED light"] == 8
    assert names["Refrigerator"] == 1
    assert names["LED television"] == 1
    assert names["Washing machine"] == 1
    assert ext["backup_hours"] == 8.0
    assert ext["bedrooms"] == 2


def test_missing_backup_is_none_not_guessed():
    ext = nlp.extract_requirements("I have 3 fans and a television.", _catalog())
    assert ext["backup_hours"] is None
    assert len(ext["appliances"]) == 2


def test_no_appliances_found():
    ext = nlp.extract_requirements("Hello, what is solar energy?", _catalog())
    assert ext["appliances"] == []


def test_word_numbers_and_backup_only_reply():
    ext = nlp.extract_requirements("8 hours of backup", _catalog())
    assert ext["backup_hours"] == 8.0
    ext2 = nlp.extract_requirements("I have two fans and five lights.", _catalog())
    names = {a["name"]: a["quantity"] for a in ext2["appliances"]}
    assert names["Ceiling fan"] == 2
    assert names["LED light"] == 5


def test_merge_extractions_accumulates():
    a = nlp.extract_requirements("I have 4 fans.", _catalog())["appliances"]
    b = nlp.extract_requirements("8 hours of backup", _catalog())["appliances"]
    merged = nlp.merge_extractions(a, b)
    assert len(merged) == 1 and merged[0]["quantity"] == 4

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import fitness


def test_bmi():
    assert fitness.calc_bmi(70, 175) == 22.9
    assert fitness.bmi_category(22.9) == "Normal vazn ✅"
    assert fitness.bmi_category(17) == "Vazn yetishmasligi"
    assert fitness.bmi_category(27) == "Ortiqcha vazn"
    assert fitness.bmi_category(31) == "Semizlik"


def test_calories_male():
    r = fitness.calc_calories("male", 80, 180, 30, "moderate")
    assert r["bmr"] == 1780
    assert r["maintain"] == 2759
    assert r["lose"] == 2259
    assert r["protein_g"] == 144


def test_calories_female():
    assert fitness.calc_bmr("female", 60, 165, 25) == 1345.25


def test_parse_number():
    assert fitness.parse_number("72,5", 20, 400) == 72.5
    assert fitness.parse_number("abc", 20, 400) is None
    assert fitness.parse_number("5", 20, 400) is None

FORMULA_PREFIXES = ('=', '+', '-', '@', '\t', '\r')


def escape_csv_formula(value):
    """Keep spreadsheet applications from evaluating user-controlled CSV cells."""
    if not isinstance(value, str):
        return value
    if value.lstrip().startswith(FORMULA_PREFIXES):
        return f"'{value}"
    return value


def safe_csv_row(values):
    return [escape_csv_formula(value) for value in values]

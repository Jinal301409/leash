from rules import check_purchase

tests = [
    ("Notebook", {"item": "Notebook", "price": 12.00, "category": "stationery"}, 0),
    ("Headphones", {"item": "Headphones", "price": 30.00, "category": "electronics"}, 0),
    ("Gift set", {"item": "Gift set", "price": 35.00, "category": "gifts"}, 0),
    ("Book, after spending $40", {"item": "Book", "price": 20.00, "category": "books"}, 40),
]

for name, purchase, spent in tests:
    result = check_purchase(purchase, spent_today=spent)
    print(f"{name}: {result['decision']} - {result['reason']}")
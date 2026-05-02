#!/usr/bin/env python3
import argparse
import json
import random
from datetime import date, timedelta
from pathlib import Path


def money(value: float) -> float:
    return round(value, 2)


def build_seed() -> dict:
    rng = random.Random(20260501)
    user_id = "maya-patel-demo"

    holdings_catalog = [
        ("VOO", "Vanguard S&P 500 ETF", "etf", 72.44, 515.2, 33120, "Broad market"),
        ("QQQ", "Invesco QQQ Trust", "etf", 18.75, 442.3, 6900, "Growth tech"),
        ("AAPL", "Apple Inc.", "stock", 16, 190.1, 2410, "Technology"),
        ("MSFT", "Microsoft Corp.", "stock", 8, 426.2, 2710, "Technology"),
        ("VTIAX", "Vanguard Total Intl Stock Index", "mutual_fund", 120, 31.4, 3400, "International"),
        ("BND", "Vanguard Total Bond Market ETF", "etf", 42, 74.1, 2920, "Fixed income"),
        ("CASH", "Brokerage sweep cash", "cash", 1, 2150, 2150, "Cash"),
    ]

    holdings = []
    for symbol, name, asset_class, quantity, price, cost_basis, sector in holdings_catalog:
        price = price * rng.uniform(0.985, 1.015)
        value = quantity * price
        holdings.append(
            {
                "symbol": symbol,
                "name": name,
                "assetClass": asset_class,
                "quantity": round(quantity, 4),
                "price": money(price),
                "value": money(value),
                "costBasis": money(cost_basis),
                "sector": sector,
            }
        )

    portfolio_value = money(sum(h["value"] for h in holdings))
    top3 = sorted(holdings, key=lambda h: h["value"], reverse=True)[:3]
    top3_concentration = round(sum(h["value"] for h in top3) / portfolio_value, 2)

    context_packet = {
        "user": {
            "id": user_id,
            "name": "Maya Patel",
            "age": 24,
            "investor_level": "beginner",
            "communication_style": "plain_english",
        },
        "goals": [
            {
                "type": "home_down_payment",
                "target_amount": 80000,
                "target_date": "2029-05",
                "priority": "high",
            }
        ],
        "risk_profile": {
            "risk_comfort": "moderate_cautious",
            "panic_response": "very_worried_at_20pct_drop",
            "liquidity_need": "may_withdraw_20pct_next_year",
        },
        "accounts_summary": {
            "taxable": True,
            "brokerage_count": 2,
            "cash_available": 2150,
            "portfolio_value": portfolio_value,
        },
        "portfolio_features": {
            "top3_concentration": top3_concentration,
            "equity_weight": 0.86,
            "cash_weight": round(2150 / portfolio_value, 2),
            "growth_tech_overlap": "high",
            "liquidity_coverage": 0.40,
        },
        "constraints": {
            "no_auto_trade": True,
            "prefer_tax_aware": True,
            "explain_costs": True,
        },
    }

    accounts = [
        {
            "id": "acct-chase-checking",
            "institution": "Chase",
            "name": "Everyday Checking",
            "type": "checking",
            "taxable": False,
            "balance": 4260.44,
        },
        {
            "id": "acct-bankofamerica-savings",
            "institution": "Bank of America",
            "name": "Advantage Savings",
            "type": "savings",
            "taxable": False,
            "balance": 12840.12,
        },
        {
            "id": "acct-amex-card",
            "institution": "American Express",
            "name": "Blue Cash Preferred",
            "type": "credit",
            "taxable": False,
            "balance": -742.66,
        },
        {
            "id": "acct-taxable-brokerage",
            "institution": "Fidelity",
            "name": "Individual Brokerage",
            "type": "brokerage",
            "taxable": True,
            "balance": money(portfolio_value * 0.55),
        },
        {
            "id": "acct-schwab-brokerage",
            "institution": "Charles Schwab",
            "name": "Schwab One Brokerage",
            "type": "brokerage",
            "taxable": True,
            "balance": money(portfolio_value * 0.24),
        },
        {
            "id": "acct-robinhood-brokerage",
            "institution": "Robinhood",
            "name": "Investing Account",
            "type": "brokerage",
            "taxable": True,
            "balance": money(portfolio_value * 0.12),
        },
        {
            "id": "acct-mutual-fund",
            "institution": "Vanguard",
            "name": "Vanguard Mutual Fund Account",
            "type": "mutual_fund",
            "taxable": True,
            "balance": 3823.34,
        },
        {
            "id": "acct-fidelity-mutual-fund",
            "institution": "Fidelity",
            "name": "Fidelity Mutual Fund Account",
            "type": "mutual_fund",
            "taxable": True,
            "balance": 5810.28,
        },
        {
            "id": "acct-trowe-mutual-fund",
            "institution": "T. Rowe Price",
            "name": "T. Rowe Price Growth Fund",
            "type": "mutual_fund",
            "taxable": True,
            "balance": 4440.92,
        },
        {
            "id": "acct-cash",
            "institution": "Fidelity",
            "name": "Brokerage Sweep Cash",
            "type": "cash",
            "taxable": True,
            "balance": 2150,
        },
    ]

    today = date.today()
    tax_lots = []
    for index, holding in enumerate(holdings):
        if holding["assetClass"] == "cash":
            continue
        tax_lots.append(
            {
                "id": f"lot-{holding['symbol'].lower()}-{index + 1}",
                "symbol": holding["symbol"],
                "acquiredAt": str(today - timedelta(days=rng.randint(120, 780))),
                "quantity": holding["quantity"],
                "costBasis": holding["costBasis"],
            }
        )

    transactions = []
    transaction_templates = {
        "checking": [
            ("Payroll deposit", 2400, "income"),
            ("Rent payment", -1325, "housing"),
            ("Grocery purchase", -86.42, "spending"),
            ("Utilities", -124.18, "spending"),
        ],
        "savings": [
            ("Automatic savings transfer", 500, "transfer"),
            ("Emergency fund transfer", 250, "transfer"),
            ("Interest paid", 8.72, "interest"),
        ],
        "credit": [
            ("Statement payment", 620, "payment"),
            ("Travel purchase", -214.2, "spending"),
            ("Restaurant", -48.6, "spending"),
        ],
        "brokerage": [
            ("ETF purchase", -300, "investment_activity"),
            ("Dividend received", 42.5, "investment_activity"),
            ("Monthly contribution", 250, "contribution"),
        ],
        "mutual_fund": [
            ("Mutual fund purchase", -250, "investment_activity"),
            ("Capital gains distribution", 76.4, "investment_activity"),
            ("Automatic investment", 150, "contribution"),
        ],
        "cash": [
            ("Sweep interest", 5.18, "interest"),
            ("Cash transfer", 300, "transfer"),
        ],
    }

    for index in range(36):
        posted_at = today - timedelta(days=index * rng.randint(11, 23))
        account = rng.choice(accounts)
        description, amount, txn_type = rng.choice(transaction_templates[account["type"]])
        transactions.append(
            {
                "id": f"txn-{index + 1:03d}",
                "postedAt": str(posted_at),
                "accountId": account["id"],
                "description": description,
                "amount": money(amount),
                "type": txn_type,
            }
        )

    memory_template = """# CalmVest Memory: Maya Patel

## Identity
- Beginner investor
- Prefers plain-English explanations

## Goals
- House down payment goal: $80,000 target by May 2029

## Risk and Liquidity
- Moderate-cautious risk comfort
- Very worried by a 20% market drop
- May need to withdraw 20% next year

## Tax and Constraints
- Taxable brokerage accounts
- No automatic trading
- Explain cost, tax, confidence, and approval status for recommendations

## Open Questions
- Confirm income stability
- Confirm exact house purchase timing
- Confirm whether sustainability preferences matter
"""

    return {
        "user": context_packet["user"],
        "contextPacket": context_packet,
        "memoryTemplate": memory_template,
        "accounts": accounts,
        "holdings": holdings,
        "taxLots": tax_lots,
        "transactions": transactions,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(build_seed(), indent=2), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

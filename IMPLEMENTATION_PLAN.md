# Follow-On Decision — Combined V1 + V2 Implementation Plan

## Goal
Turn the existing reserve estimate into a complete follow-on capital-allocation workspace that compares skip, pro rata, super pro rata, and secondary purchases while ranking the choices against fund constraints.

## Delivered scope
1. Dedicated Follow-On Decision tab with independent browser persistence, reset, clear, CSV export, and print behavior.
2. Exact scenario inputs for current position, new primary round, secondary block, future dilution, exit, and portfolio constraints.
3. Side-by-side calculations for new capital, post-round ownership, exit ownership, incremental MOIC, incremental IRR, total MOIC, and fund concentration.
4. Portfolio-ranking layer using thesis strength, performance vs plan, ownership importance, confidence, return thresholds, reserves, and concentration limits.
5. Transparent recommendation, reserve impact, primary-versus-secondary price comparison, and IC memo output.
6. Automated Playwright coverage for the baseline recommendation and constraint-driven ranking change.

## Decision rules
- Re-underwrite each new check independently of sunk cost.
- Separate incremental returns from total-position returns.
- Reject options that breach reserves or concentration limits or miss minimum incremental return thresholds.
- Rank remaining choices transparently; do not present the score as autonomous investment advice.

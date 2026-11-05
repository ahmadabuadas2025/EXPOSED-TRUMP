# Research methodology

The published site carries the full methodology (Method page). This file records the research process behind release 0.1 (22 October 2026).

## Investigative questions

1. What policy decisions on Israel did the Trump administrations make, and what do the primary records say? (Jerusalem, Golan, settlements, arms sales, Abraham Accords, Gaza plans)
2. What documented financial relationships link Trump, the Trump Organization, Jared Kushner, Affinity Partners, Kushner Companies, World Liberty Financial and the Witkoffs to Israeli, Saudi, Qatari and Emirati entities?
3. For each relationship: who actually benefited, what was the source of funds, when did it happen, how much was involved, and what type of amount is it?
4. Is there evidence that any financial interest influenced a specific policy decision? Where the evidence doesn't reach that far, what remains unknown?
5. What responses, denials and exculpatory facts are on record?

## Process

1. **Reference analysis.** See `REFERENCE_ANALYSIS.md`.
2. **Source discovery.** About 40 targeted web searches, prioritising government, congressional and company sources, then wire services and established outlets. Results were logged with publisher, date and URL. Only URLs actually returned by searches were recorded. None were constructed.
3. **Primary-document retrieval.** Full text was retrieved and read for: Proclamation 9683 (82 FR 58331), Proclamation 9852 (84 FR 11875), CRS report RL33222 (Nov. 2020), the Senate Finance Committee's 25 September 2024 letter on Affinity Partners, and CREW's 8 February 2021 analysis. Quotes on the site come only from these documents. The Trump Organization's Qatar release returned HTTP 403 and is marked blocked.
4. **Claim extraction.** Each finding was written as one checkable statement. Contested figures are attributed to whoever published them. Responses were recorded only where a source reports them, and unsourced responses were removed during review.
5. **Classification.** The six evidence classes and five connection levels are defined on the Method page. Independence is computed: sources that restate another outlet count as that outlet.
6. **Financial typing.** 17 amount categories. Commitments, valuations, proceeds, revenue and contributions are never merged. Components are linked to their parents, ranges are used where reports differ, and arithmetic is shown on the amount (e.g. the Phoenix reconciliation).
7. **Validation.** `pipeline/build.py` enforces the rules. `pipeline/tests` proves each rule rejects a violating case. `pipeline/linkcheck.py` checks every URL.

## Editorial safeguards applied

- No finding implies criminal conduct. Inquiries and letters are described as such, not as findings of wrongdoing.
- Political contributions (e.g. Adelson's ~$100M) are typed as such and never presented as personal income.
- Gifts to the US government (the Qatari 747) are distinguished from gifts to Trump.
- Fund capital (the $2B PIF commitment) is distinguished from the founder's income.
- Enterprise values (the $55B EA deal) are distinguished from any one investor's stake.
- Findings that show no financial connection (Trump Heights, the 2016 MOU, the inference on the Jerusalem/Golan/settlements decisions) are featured on the home page alongside the strongest findings.

## Information gaps

Listed on the Method page under "Unresolved questions", and in the README under "Known limitations".

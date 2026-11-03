# Query pins (generated)

Every `assertNumQueries` in the backend test suite, in one place. Regenerate
after adding or changing a pin:

    cd backend && python -m scripts.query_pins --write

A pin is a budget: raising one is a review conversation, not a test edit.

_16 pins across the suite._

| file | line | test | queries | why |
| :--- | ---: | :--- | ---: | :--- |
| `features/access/tests.py` | 146 | `test_cold_permission_snapshot_uses_two_queries_and_warm_snapshot_uses_none` | 2 | — |
| `features/access/tests.py` | 148 | `test_cold_permission_snapshot_uses_two_queries_and_warm_snapshot_uses_none` | 0 | — |
| `features/adminconsole/test_roles.py` | 52 | `test_role_list_member_counts_use_one_query_independent_of_role_count` | 1 | — |
| `features/adminconsole/tests.py` | 568 | `test_the_users_list_stays_a_fixed_query_count` | 6 | auth/touch/count/page plus two constant-query role-summary reads |
| `features/auth/tests.py` | 716 | `test_my_sessions_is_two_queries_beyond_the_auth_pair` | 3 | auth + touch + the device list |
| `features/catalog/tests.py` | 229 | `test_a_revalidating_request_answers_304_with_zero_queries` | 0 | — |
| `features/catalog/tests.py` | 236 | `test_a_warm_request_answers_200_with_zero_queries` | 0 | — |
| `features/catalog/tests.py` | 243 | `test_a_detail_404_is_cached_negatively` | 0 | — |
| `features/catalog/tests.py` | 301 | `test_a_cold_list_costs_exactly_two_queries` | 2 | — |
| `features/catalog/tests.py` | 307 | `test_a_warm_detail_costs_zero_queries` | 0 | — |
| `features/courses/test_lifecycle.py` | 370 | `test_course_detail_remains_four_queries_with_relations` | 4 | — |
| `features/courses/tests.py` | 247 | `test_detail_is_a_constant_query_count` | 4 | course + modules + lessons + live sessions |
| `features/courses/tests.py` | 279 | `test_enroll_bumps_the_catalog_cache_after_the_commit` | 2 | a miss at the bumped version, not a stale hit |
| `features/dashboard/tests.py` | 191 | `test_summary_is_a_fixed_query_count` | 7 | auth + touch + priority + live + stats + enrollment sync + upcoming events |
| `features/dashboard/tests.py` | 201 | `test_enrolled_is_one_query_beyond_the_auth_pair` | 3 | auth + touch + one select_related query |
| `features/dashboard/tests.py` | 210 | `test_saved_is_two_queries_beyond_the_auth_pair` | 4 | auth + touch + scholarships + favorites |

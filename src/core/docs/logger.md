# Winston log level
| Level     | Priority | Meaning                                                                                                 |  Support |
| --------- | -------- | ------------------------------------------------------------------------------------------------------- | -------- |
| `error`   | 0        | Something failed — code couldn’t continue normally. You usually alert on this.                          |    ✅    |
| `warn`    | 1        | Something unexpected happened, but the app can continue. E.g., deprecated API, missing optional config. |    ✅    |
| `info`    | 2        | General operational messages — app started, user logged in, task completed, etc.                        |    ✅    |
| `http`    | 3        | (optional, user-defined) HTTP-specific events — request logs, status codes, latency.                    |    ✅    |
| `verbose` | 4        | Detailed info for tracing complex flows — e.g., database query results.                                 |    ✅    |
| `debug`   | 5        | Debugging messages, usually turned on only in development.                                              |    ✅    |
| `silly`   | 6        | Extremely fine-grained, often noisy — like internal state dumps.                                        |    ❌    |

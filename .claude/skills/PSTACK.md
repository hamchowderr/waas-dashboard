# pstack skills

These 14 skills are copies from [pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan (MIT licence, below), version 0.15.36, taken at commit `de8ee15d` of `cursor/plugins`. Claude Code loads them from this folder. Most of them run only when asked for by name, such as `/statechart` or `/blast-radius`.

| Skill | Use it for |
|---|---|
| `statechart` | Checking a TLA+ model of something that moves between states (a checkout, a store's life, a job) and drawing it as a Mermaid statechart, with the shortest path to each state that breaks a rule |
| `create-formal-verification-skill` | Writing a skill that checks one part of this code with a formal model |
| `maintain-formal-verification-skill` | Keeping such a skill's model in step with the code |
| `blast-radius` | Finding what a change could break outside its diff, and proving it safe by running real code |
| `tdd` | Test-first work, when a test is asked for or a cheap local test target is obvious |
| `correct` | Turning a mistake agents repeat into a check that makes it impossible |
| `typescript-best-practices` | TypeScript types and patterns |
| `principle-model-the-domain` | Naming and shaping code after the business it serves |
| `principle-subtract-before-you-add` | Removing before adding |
| `principle-type-system-discipline` | Letting types rule out wrong states |
| `principle-make-operations-idempotent` | Making retries and repeats safe |
| `principle-boundary-discipline` | Checking input at the edges, trusting it inside |
| `principle-fix-root-causes` | Fixing the cause, not the symptom |
| `principle-prove-it-works` | Showing a change works on the running system before calling it done |

`statechart` runs `scripts/statechart`; its first run installs TLC (the TLA+ model checker) and Java with mise and needs the network. Its test corpus (`scripts/test/`) is left out of this copy.

To update, copy the same folders from a newer `cursor/plugins` checkout, leave out `statechart/scripts/test/`, and change the version and commit above. Don't edit the copies.

## Licence

MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

# Custom Interactions
![codeql](https://github.com/bartick/custom-interactions/actions/workflows/codeql-analysis.yml/badge.svg) &nbsp;
![Custom Interaction](https://github.com/bartick/custom-interactions/actions/workflows/test.yml/badge.svg)      
&nbsp;

Have you every wondered why just use github action reply for 1st interaction and not n<sup>th</sup> Interaction or upto n<sup>th</sup> interaction.       
This action (custom-interactions) helps you achieve that goal. You can use it to create custom interactions for your github action for upto n<sup>th</sup> interaction.

## Input
| Name | Description |
| --- | --- |
| `token` | Token for the repository. Can be passed in using {{ secrets.GITHUB_TOKEN }} |
| `issue-message` | Comment to post on an individual''s issue |
| `issue-number` | The number of interaction this action should be valid for. |
| `issue-once` | `true` or `false`. This states if the interaction is on/upto n<sup>th</sup> interaction |
| `pr-message` | Comment to post on an individual''s PR |
| `pr-number` | The number of interaction this action should be valid for. |
| `pr-once` | `true` or `false`. This states if the interaction is on/upto n<sup>th</sup> interaction |

## Example
```yaml
name: Greetings

on: [pull_request, issues]

jobs:
  greeting:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
    steps:
    - uses: bartick/custom-interactions@v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        issue-message: |
          Thank you for opening your first issue in our repository, one of our maintainers will get in touch with you soon.
        pr-message: |
          Thank you for opening your first pull request in our repository, one of our maintainers will get in touch with you soon.
        pr-once: false
        issue-once: false
        pr-number: 10
        issue-number: 10
```
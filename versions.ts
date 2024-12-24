export const versions = [
  ` Version 2.7 changes:
- Fix negative UTC offset timezones
`,
  ` Version 2.6 changes:
- Fixed the acquire modal to report time in users timezone
- Removed old device reference
`,
  `Version 2.5 changes:
- 8am-8pm reminder checks now happen in the users local timezone
- If more than 1000 devices in total, allocat now still functions
- Updated README with demo pictures
`,
  `Version 2.4 changes:
- Added a force release resource option for specific users
`,
  `Version 2.3 changes:
- Delayed the removal of old triggers to fix a slack update\n(Messages posted from the reminder message should now work again)
`,
  `Version 2.2 changes:
- Tweaked how old triggers are removed to speed up the release step
`,
  `Version 2.1 changes:
- Changed how old triggers are removed to fix Slack September update change
`,
  `Version 2.0 changes:
- There is now a "Review workflow access" before each action. This is due to Slack + watching emojis
- Messages personal to you (reminders etc) now come in the Allocat DM channel
- 1 day option now available on reminder messages
- Reminder messages now disappear after a release/renew has occurred
- Allocat now *has* to be invited to a channel (even if it's public) for full functionality to work
- BETA: Reacting with 'eyes' :eyes: to "x borrow a for 2 hours" message will send you a reminder when it's free (This works only for new borrow messages _from this point on_!)
`,
  `Version 1.2 changes:
- Resources are listed in alphabetical order (compareLocale)
`,
  `Version 1.1 changes:
- Reminder-reminder messages now do not appear >= 8pm and <= 8am (In UTC)
- There are 1/2/3 day options available for acquiring a resource
- The reminder messages are now every 15 minutes if you don't respond
- The resource name is now in *bold* in messages
`,
];

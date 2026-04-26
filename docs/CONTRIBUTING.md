# Contributing Guide

Thank you for contributing to The Payments Nerd newsletter platform!

## Development Workflow

### 1. Set Up Development Environment

Follow the [SETUP.md](SETUP.md) guide to configure your local environment.

**Required:**
- Node.js 20+
- Python 3.11+
- Git
- OpenAI API key
- Resend account
- Supabase project

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 3. Make Changes

**Code Style:**
- Follow existing code formatting
- Use TypeScript for type safety
- Write descriptive variable names
- Add comments for complex logic

**File Organization:**
- Place React components in `/web/components`
- API routes in `/web/app/api`
- Utilities in `/web/lib`
- Email templates in `/web/emails`

### 4. Test Your Changes

```bash
# Run tests
cd web
npm test

# Build to check for errors
npm run build

# Test locally
npm run dev
```

**Manual Testing:**
- Test subscription flow end-to-end
- Send test emails
- Verify database updates
- Check responsive design

### 5. Commit Your Changes

**Commit Message Format:**

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, no code change
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat(subscribe): add referral tracking to subscription flow"
git commit -m "fix(email): resolve iCloud delivery issues with DMARC"
git commit -m "docs(setup): update environment variable instructions"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

**Pull Request Checklist:**
- [ ] Code builds without errors
- [ ] Tests pass
- [ ] Documentation updated (if applicable)
- [ ] No console errors or warnings
- [ ] Follows existing code style
- [ ] Commit messages are descriptive

**PR Description Template:**

```markdown
## Description
Brief description of what this PR does.

## Changes
- List of changes made
- Another change
- And another

## Testing
How to test these changes.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Fixes #123
```

## Code Standards

### TypeScript

**Use explicit types:**
```typescript
// Good
function sendEmail(email: string, subject: string): Promise<void> {
  // ...
}

// Avoid
function sendEmail(email, subject) {
  // ...
}
```

**Use interfaces for objects:**
```typescript
interface Subscriber {
  id: string;
  email: string;
  active: boolean;
  confirmed: boolean;
}
```

### React Components

**Use functional components with hooks:**
```typescript
export default function SubscribeForm() {
  const [email, setEmail] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // ...
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

**Component file structure:**
```typescript
// 1. Imports
import { useState } from 'react';

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Component
export default function Component({ title }: Props) {
  // 4. Hooks
  const [state, setState] = useState('');

  // 5. Functions
  function handleClick() {
    // ...
  }

  // 6. Render
  return <div>{title}</div>;
}
```

### API Routes

**Standard response format:**
```typescript
// Success
return NextResponse.json({
  ok: true,
  data: result
}, { status: 200 });

// Error
return NextResponse.json({
  ok: false,
  error: 'Error message'
}, { status: 400 });
```

**Error handling:**
```typescript
export async function POST(req: Request) {
  try {
    // ... logic
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### Python (AI Module)

**Follow PEP 8:**
```python
# Good
def fetch_rss_feeds(config: dict) -> list[Article]:
    """Fetch articles from RSS feeds.

    Args:
        config: Configuration dictionary with feed URLs

    Returns:
        List of Article objects
    """
    articles = []
    # ...
    return articles
```

**Type hints:**
```python
from typing import List, Dict, Optional

def process_article(
    title: str,
    content: str,
    source: Optional[str] = None
) -> Dict[str, str]:
    # ...
```

## Testing

### Unit Tests

**Location:** `/web/lib/*.test.ts`

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from './emailTokens';

describe('Email Tokens', () => {
  it('should generate and verify valid token', () => {
    const email = 'test@example.com';
    const token = generateToken(email);
    const result = verifyToken(token);

    expect(result).toBeDefined();
    expect(result?.email).toBe(email);
  });
});
```

### Integration Tests

**Test subscription flow:**
```bash
# 1. Subscribe
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Check confirmation email
# Click link in email

# 3. Verify in Supabase
# Check subscriber is confirmed and active
```

## Security

### Never Commit Secrets

**Use environment variables:**
```typescript
// Good
const apiKey = process.env.OPENAI_API_KEY;

// Never do this
const apiKey = 'sk-proj-xxxxxxxxxxxxx';
```

### Validate User Input

```typescript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
}

// SQL injection prevention (use Supabase client, not raw SQL)
// Good
const { data } = await supabase
  .from('subscribers')
  .select('*')
  .eq('email', email);

// Bad (vulnerable to SQL injection)
const result = await db.query(`SELECT * FROM subscribers WHERE email = '${email}'`);
```

### Sanitize Output

```typescript
// XSS prevention (React does this automatically)
// But be careful with dangerouslySetInnerHTML

// Safe
<div>{userInput}</div>

// Unsafe
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

## Documentation

### Code Comments

**Use JSDoc for functions:**
```typescript
/**
 * Sends a newsletter email to a subscriber
 * @param email - Subscriber email address
 * @param newsletter - Newsletter data object
 * @returns Promise resolving to send result
 */
async function sendNewsletter(
  email: string,
  newsletter: Newsletter
): Promise<SendResult> {
  // ...
}
```

**Explain complex logic:**
```typescript
// Calculate the next send time based on timezone
// We use UTC 7:00 AM which converts to:
// - 2:00 AM EST
// - 11:00 PM PST (previous day)
const sendTime = new Date();
sendTime.setUTCHours(7, 0, 0, 0);
```

### Update Documentation

When making changes, update relevant docs:

- **README.md** - If architecture or features change
- **SETUP.md** - If setup steps change
- **ARCHITECTURE.md** - If system design changes
- **EMAIL_SYSTEM.md** - If email logic changes
- **DEPLOYMENT.md** - If deployment process changes

## Common Tasks

### Add a New API Route

1. Create file: `/web/app/api/your-route/route.ts`
2. Implement GET/POST handler
3. Add authentication if needed
4. Update API endpoints table in README
5. Test endpoint manually

### Add a New Component

1. Create file: `/web/components/YourComponent.tsx`
2. Define TypeScript interface for props
3. Implement component
4. Add to appropriate page
5. Test responsiveness

### Modify Email Template

1. Edit: `/web/emails/DailyNewsletter.tsx`
2. Test with: `npx tsx scripts/previewEmail.ts`
3. Send test email to verify rendering
4. Check on multiple email clients (Gmail, Apple Mail, Outlook)

### Update Newsletter AI Logic

1. Edit: `/ai/src/main.py` or `/ai/src/tools.py`
2. Test locally: `python -m ai.src.main`
3. Verify `newsletter.json` output
4. Check for duplicates and quality

### Update Industry Trends (`ai/config.yml`)

The `current_trends` block in `ai/config.yml` shapes which stories the AI agent
prioritizes (see `format_trends_for_prompt` in `ai/src/main.py`). Edits here
have measurable downstream impact on newsletter content, so every change is
gated on evidence.

**Required for every PR that touches `current_trends`:**

1. **Run the eval harness** against the previous version:
   ```bash
   python ai/scripts/trend_diff.py --old git:main --new ai/config.yml --days 30
   ```

2. **Paste the output table into the PR description.** Reviewers use it to
   sanity-check that the change is intentional (not accidental coverage loss
   or unintentional skew). PRs touching `ai/config.yml` without a `trend_diff.py`
   table will be sent back for one.

3. **Run the schema test** before pushing:
   ```bash
   python -m unittest ai.tests.test_config_loads
   ```

4. **Honor the weight rubric** (documented in the `ai/config.yml` header):
   - Max 1 trend at weight 10
   - Max 3 trends at weight 8+
   - Max 5 trends at weight 6+

5. **Keep signals to ≤4 words.** Long descriptive phrases ("declining guest
   checkout preference") will not regex-match news copy and dilute attention
   in the agent prompt. Use short keywords that actually appear in articles
   (`"guest checkout"`, `"FedNow"`, `"USDC"`).

The `Validate ai/config.yml schema` step in
`.github/workflows/generate_news.yml` blocks the daily pipeline if any of
the above are violated, so a malformed config will fail in CI before
burning OpenAI tokens on a doomed agent run.

## Debugging

### Enable Debug Logging

**Next.js:**
```bash
DEBUG=* npm run dev
```

**Python AI:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Common Issues

**Issue: Environment variables not loading**

Solution: Ensure `.env` is in project root, not `/web`

**Issue: Supabase connection fails**

Solution: Check project isn't paused (free tier auto-pauses)

**Issue: Emails go to spam**

Solution: Verify SPF/DKIM/DMARC records (see EMAIL_SYSTEM.md)

## Getting Help

- **Documentation:** Start with [README.md](../README.md)
- **Setup Issues:** See [SETUP.md](SETUP.md)
- **Email Problems:** See [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md)
- **Questions:** Open a GitHub Discussion
- **Bugs:** Open a GitHub Issue

## Code Review Process

### What to Expect

1. **Automated Checks:** Tests, linting, build
2. **Manual Review:** Code quality, security, best practices
3. **Feedback:** Suggestions for improvement
4. **Approval:** Once all checks pass and feedback addressed

### Responding to Feedback

- Be open to suggestions
- Ask questions if unclear
- Make requested changes
- Update PR description if scope changes

## Release Process

1. Merge to `main` branch
2. Vercel auto-deploys to production
3. Monitor for errors
4. Verify functionality in production
5. Tag release (optional): `git tag v1.0.0`

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Questions?

Feel free to:
- Open a GitHub Issue
- Start a Discussion
- Contact: newsletter@thepaymentsnerd.co

Thank you for contributing to The Payments Nerd!

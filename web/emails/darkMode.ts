// Shared dark-mode CSS for all email templates.
// Apple Mail (and some other clients) will render dark mode when users have it
// enabled at the OS level. These overrides use !important because react-email
// compiles styles to inline `style=""` attributes, which beat external CSS.
export const emailDarkModeCss = `
  @media (prefers-color-scheme: dark) {
    body, .email-body { background-color: #0a0a0a !important; }
    .email-container { background-color: #171717 !important; }
    .text-heading { color: #fafafa !important; }
    .text-body-strong { color: #e5e5e5 !important; }
    .text-body { color: #d4d4d4 !important; }
    .text-muted { color: #a3a3a3 !important; }
    .text-subtle { color: #737373 !important; }
    .email-divider { border-top-color: #262626 !important; }
    .email-footer { border-top-color: #262626 !important; }
    .bg-card { background-color: #262626 !important; border-color: #404040 !important; }
    .link-primary { color: #60a5fa !important; }
    .confirm-button { background-color: #fafafa !important; color: #0a0a0a !important; }
    .analysis-body, .analysis-body p, .analysis-body li, .analysis-body td { color: #d4d4d4 !important; }
    .analysis-body h1, .analysis-body h2, .analysis-body h3, .analysis-body h4, .analysis-body strong { color: #fafafa !important; }
    .analysis-body a { color: #60a5fa !important; }
    .analysis-body hr { border-top-color: #262626 !important; }
    .analysis-body blockquote { border-left-color: #404040 !important; color: #a3a3a3 !important; }
  }
`;

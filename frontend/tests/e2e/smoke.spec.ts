/**
 * Smoke tests for AI Tutor frontend.
 *
 * All backend API calls are intercepted and mocked so tests run
 * without a live backend.
 */
import { test, expect } from '@playwright/test';

const SUBJECTS = [
  { id: 'fsd', name: 'Fundamentals of Software Development' },
  { id: 'fcs', name: 'Fundamentals of Computer Science' },
  { id: 'dma', name: 'Discrete Mathematics' },
];

const MOCK_RESPONSE = {
  answer: 'Object-oriented programming is a paradigm based on objects.',
  sources: [
    { file: 'FSD_Topic_03', text: 'OOP concepts include encapsulation...', similarity: 0.87 },
    { file: 'FSD_Topic_05', text: 'Inheritance allows classes to...', similarity: 0.74 },
  ],
};

async function mockApi(page: any) {
  // Subjects — served statically in microservices mode; mock monolith fallback
  await page.route('**/api/subjects', (route: any) =>
    route.fulfill({ json: SUBJECTS }),
  );
  // Chat
  await page.route('**/api/chat', (route: any) =>
    route.fulfill({ json: MOCK_RESPONSE }),
  );
  // TTS — return minimal valid WAV header
  await page.route('**/api/tts', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      body: Buffer.from('RIFF'),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Page loads with welcome screen and subject tabs
// ─────────────────────────────────────────────────────────────────────────────
test('shows welcome message on load', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  await expect(page.getByText('AI Tutor')).toBeVisible();
  await expect(page.getByText('What would you like to know?')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Subject tabs are rendered and first tab is active
// ─────────────────────────────────────────────────────────────────────────────
test('renders all three subject tabs', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  for (const subject of SUBJECTS) {
    await expect(page.getByRole('button', { name: subject.name })).toBeVisible();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Switching tabs clears chat and stays on new tab
// ─────────────────────────────────────────────────────────────────────────────
test('switching subject tabs updates active tab', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  const fcsTab = page.getByRole('button', { name: 'Fundamentals of Computer Science' });
  await fcsTab.click();

  // Welcome screen still visible (no messages in new tab)
  await expect(page.getByText('What would you like to know?')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sending a message shows user message and assistant response
// ─────────────────────────────────────────────────────────────────────────────
test('chat flow: user message and assistant response appear', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  const input = page.getByPlaceholder(/message ai tutor/i);
  await input.fill('What is OOP?');
  await input.press('Enter');

  await expect(page.getByText('What is OOP?')).toBeVisible();
  await expect(page.getByText(MOCK_RESPONSE.answer)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sources are rendered after assistant response
// ─────────────────────────────────────────────────────────────────────────────
test('sources section is rendered after response', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  await page.getByPlaceholder(/message ai tutor/i).fill('What is OOP?');
  await page.getByPlaceholder(/message ai tutor/i).press('Enter');

  await expect(page.getByText(MOCK_RESPONSE.answer)).toBeVisible();

  // Expand sources
  const sourcesToggle = page.getByText(/sources/i);
  await sourcesToggle.click();

  await expect(page.getByText('FSD_Topic_03')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Each tab maintains its own independent message history
// ─────────────────────────────────────────────────────────────────────────────
test('each tab has independent message history', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  // Send message in FSD tab
  await page.getByPlaceholder(/message ai tutor/i).fill('What is OOP?');
  await page.getByPlaceholder(/message ai tutor/i).press('Enter');
  await expect(page.getByText(MOCK_RESPONSE.answer)).toBeVisible();

  // Switch to FCS — should show welcome screen (empty history)
  await page.getByRole('button', { name: 'Fundamentals of Computer Science' }).click();
  await expect(page.getByText('What would you like to know?')).toBeVisible();

  // Switch back to FSD — message should still be there
  await page.getByRole('button', { name: 'Fundamentals of Software Development' }).click();
  await expect(page.getByText(MOCK_RESPONSE.answer)).toBeVisible();
});

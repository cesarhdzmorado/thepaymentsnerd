import { describe, expect, it, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";

describe("HomeSections regressions", () => {
  let fileContent: string;

  beforeAll(async () => {
    fileContent = await fs.readFile(
      path.join(__dirname, "HomeSections.tsx"),
      "utf-8"
    );
  });

  it("LeadStorySection does not contain gradient left-border element", () => {
    // The old left-border div had these distinctive classes
    expect(fileContent).not.toContain(
      "absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b"
    );
  });

  it("does not use animate-fade-in-up class (removed in animation refactor)", () => {
    expect(fileContent).not.toContain("animate-fade-in-up");
  });

  it("does not use inline animationDelay styles (removed in animation refactor)", () => {
    expect(fileContent).not.toContain("animationDelay");
  });

  it("all content sections are wrapped in AnimateOnScroll", () => {
    // Count AnimateOnScroll usage - should wrap LeadStory, QuickHits, Curiosity, WhatsHot
    const matches = fileContent.match(/<AnimateOnScroll>/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(4);
  });

  it("hero section uses HeroAnimations wrapper", () => {
    expect(fileContent).toContain("<HeroAnimations>");
    expect(fileContent).toContain("</HeroAnimations>");
  });

  it("share buttons are hidden on mobile", () => {
    expect(fileContent).toContain("hidden sm:flex");
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Button } from './button';
import { Card } from './card';
import { Toggle } from './toggle';
import { Table } from './table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from './dialog';
import { FoodToggle } from '../food-toggle';

/**
 * Phase 18 (US13) mobile-layout guardrail checks for shared UI primitives most
 * likely to break at the 375 px Android baseline. These assert the specific
 * layout-safety classes/behaviors are present so regressions are caught early.
 * (jsdom has no real layout engine, so these are class/behavior contract checks.)
 */
describe('UI primitives: Android mobile-layout guardrails', () => {
  it('Dialog does not touch viewport edges and scrolls tall content on mobile', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>dialog body</DialogContent>
      </Dialog>
    );

    const content = screen.getByText('dialog body');
    // Content region must be able to scroll and stay within the viewport height.
    expect(content.className).toContain('max-h-[90vh]');
    expect(content.className).toContain('overflow-y-auto');
    expect(content.className).toContain('w-full');

    // The centering container must have padding so the dialog never touches edges.
    const centeringContainer = content.parentElement as HTMLElement;
    expect(centeringContainer.className).toContain('p-4');
  });

  it('DialogFooter stacks actions on mobile and rows them on larger screens', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogFooter data-testid="footer">
            <Button>Cancel</Button>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex-col-reverse');
    expect(footer.className).toContain('sm:flex-row');
  });

  it('Table wraps in a horizontally contained region to avoid page overflow', () => {
    render(
      <Table data-testid="table">
        <tbody>
          <tr>
            <td>cell</td>
          </tr>
        </tbody>
      </Table>
    );

    const table = screen.getByTestId('table');
    const wrapper = table.parentElement as HTMLElement;
    expect(wrapper.className).toContain('overflow-auto');
    expect(wrapper.className).toContain('w-full');
  });

  it('Tabs accept a responsive TabsList and switch panels on tap', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.queryByText('Panel B')).not.toBeInTheDocument();

    // Responsive grid class is applied to the list container.
    const list = screen.getByText('A').parentElement as HTMLElement;
    expect(list.className).toContain('grid-cols-2');
    expect(list.className).toContain('sm:grid-cols-4');

    fireEvent.click(screen.getByText('B'));
    expect(screen.getByText('Panel B')).toBeInTheDocument();
    expect(screen.queryByText('Panel A')).not.toBeInTheDocument();
  });

  it('Toggle exposes pressed state and is tap-toggleable', () => {
    const onPressedChange = vi.fn();
    render(
      <Toggle pressed={false} onPressedChange={onPressedChange}>
        No
      </Toggle>
    );

    const toggle = screen.getByRole('button', { name: 'No' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it('FoodToggle renders touch-friendly (>=44px) meal toggles', () => {
    render(
      <FoodToggle
        meals={{ breakfast: true, lunch: false, dinner: true }}
        onChange={() => {}}
      />
    );

    const toggles = screen.getAllByRole('button');
    expect(toggles).toHaveLength(3);
    for (const toggle of toggles) {
      // h-11 == 2.75rem == 44px minimum touch target.
      expect(toggle.className).toContain('h-11');
    }
    expect(screen.getAllByText('Yes')).toHaveLength(2);
    expect(screen.getAllByText('No')).toHaveLength(1);
  });

  it('Card and Button render without forcing fixed widths', () => {
    render(
      <Card data-testid="card">
        <Button data-testid="btn">Save</Button>
      </Card>
    );

    const card = screen.getByTestId('card');
    const button = screen.getByTestId('btn');
    // Neither should hard-code a pixel width that could overflow a 375px screen.
    expect(card.className).not.toMatch(/\bw-\[/);
    expect(button.className).not.toMatch(/\bw-\[/);
  });
});

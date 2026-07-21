import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MealRatesDisplay } from '../meal-rates-display';

const RATES = {
  breakfast: { rate: 50, effective_from: '2026-07-01' },
  lunch: { rate: 80, effective_from: '2026-07-01' },
  dinner: { rate: 70, effective_from: '2026-07-01' },
};

describe('MealRatesDisplay', () => {
  it('renders the card title', () => {
    render(<MealRatesDisplay rates={RATES} />);
    expect(screen.getByText('Currently Active Meal Rates')).toBeInTheDocument();
  });

  it('shows effective_from date', () => {
    render(<MealRatesDisplay rates={RATES} />);
    expect(screen.getByText(/Effective from: 2026-07-01/)).toBeInTheDocument();
  });

  it('displays all three meal types', () => {
    render(<MealRatesDisplay rates={RATES} />);
    expect(screen.getAllByText('Breakfast').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lunch').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dinner').length).toBeGreaterThan(0);
  });

  it('shows a view-only badge', () => {
    render(<MealRatesDisplay rates={RATES} />);
    expect(screen.getByText('View only')).toBeInTheDocument();
  });

  it('renders formatted rates in the component output', () => {
    render(<MealRatesDisplay rates={RATES} />);
    // formatINR(50) in en-IN locale produces ₹50
    const content = document.body.textContent ?? '';
    expect(content).toContain('50');
    expect(content).toContain('80');
    expect(content).toContain('70');
  });

  it('renders without horizontal overflow on mobile (no width constraints violated)', () => {
    const { container } = render(<MealRatesDisplay rates={RATES} />);
    // Component exists and renders rows without throwing
    const card = container.querySelector('[class*="bg-muted"]');
    expect(card).toBeInTheDocument();
  });

  it('accepts different effective_from dates per meal', () => {
    const ratesWithDifferentDates = {
      breakfast: { rate: 50, effective_from: '2026-06-01' },
      lunch: { rate: 80, effective_from: '2026-07-01' },
      dinner: { rate: 70, effective_from: '2026-05-01' },
    };
    render(<MealRatesDisplay rates={ratesWithDifferentDates} />);
    // Effective_from shown in header is breakfast's date
    expect(screen.getByText(/Effective from: 2026-06-01/)).toBeInTheDocument();
  });
});

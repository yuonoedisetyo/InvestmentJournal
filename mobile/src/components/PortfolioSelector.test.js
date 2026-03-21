import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PortfolioSelector from './PortfolioSelector';
import { samplePortfolios } from '../test-utils/mockData';

describe('PortfolioSelector', () => {
  it('renders chips and calls onSelect', () => {
    const onSelect = jest.fn();

    render(<PortfolioSelector portfolios={samplePortfolios} selectedPortfolioId={1} onSelect={onSelect} />);

    fireEvent.press(screen.getByText('Trading'));

    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

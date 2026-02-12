import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
    it('renders without crashing', () => {
        render(<App />);
        // Since the app starts with LibraryUpload which works without props in the initial state or returns something specific
        // We can just check if the container is present or specific text from LibraryUpload
        // For now, just rendering successfully is a good smoke test.
        expect(document.body).toBeTruthy();
    });
});

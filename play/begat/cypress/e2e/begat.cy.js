/**
 * Begat - E2E Tests (Cypress)
 *
 * End-to-end tests covering:
 * - Game startup flow
 * - Quiz interaction
 * - Card placement
 * - Menu navigation
 * - Accessibility checks
 */

describe('Begat Game', () => {
    beforeEach(() => {
        // Visit the game page (adjust URL for your local server)
        cy.visit('/play/begat/index.html');

        // Wait for loading screen to disappear
        cy.get('#loadingScreen', { timeout: 5000 }).should('have.class', 'hidden');
    });

    describe('Start Screen', () => {
        it('should display the start screen on load', () => {
            cy.get('#startScreen').should('be.visible');
            cy.get('.start-title').should('contain', 'BEGAT');
            cy.get('.start-subtitle').should('contain', 'The Lineage of Jesus');
        });

        it('should show level info and time limit', () => {
            cy.get('#startLevelInfo').should('contain', 'Level 1');
            cy.get('#startTimeLimit').should('contain', 'Time Limit');
        });

        it('should have a music toggle button', () => {
            cy.get('#startMusicToggle').should('be.visible');
            cy.get('#startMusicToggle').click();
            cy.get('#startMusicToggle').should('contain', 'OFF');
            cy.get('#startMusicToggle').click();
            cy.get('#startMusicToggle').should('contain', 'ON');
        });

        it('should start the game when Start button is clicked', () => {
            cy.get('#startGameBtn').click();
            cy.get('#startScreen').should('have.class', 'hidden');
            cy.get('.timeline').should('be.visible');
            cy.get('.card-pool').should('be.visible');
        });
    });

    describe('Game Board', () => {
        beforeEach(() => {
            cy.get('#startGameBtn').click();
        });

        it('should display the timeline with fixed endpoints', () => {
            cy.get('.timeline-slot').should('have.length.at.least', 2);
            cy.get('.timeline-slot.fixed').should('have.length.at.least', 2);
        });

        it('should display locked cards in the card pool', () => {
            cy.get('.card-pool .card.locked').should('have.length.at.least', 1);
        });

        it('should display score and timer', () => {
            cy.get('#scoreDisplay').should('contain', 'Score');
            cy.get('#timerDisplay').should('be.visible');
        });

        it('should display level indicator', () => {
            cy.get('#levelIndicator').should('contain', 'Level 1');
        });
    });

    describe('Quiz System', () => {
        beforeEach(() => {
            cy.get('#startGameBtn').click();
        });

        it('should open quiz modal when clicking a locked card', () => {
            cy.get('.card.locked').first().click();
            cy.get('#quizModal').should('have.class', 'active');
        });

        it('should display quiz description and options', () => {
            cy.get('.card.locked').first().click();
            cy.get('#quizDescription').should('not.be.empty');
            cy.get('.quiz-option').should('have.length', 4);
        });

        it('should close quiz with Escape key', () => {
            cy.get('.card.locked').first().click();
            cy.get('#quizModal').should('have.class', 'active');
            cy.get('body').type('{esc}');
            cy.get('#quizModal').should('not.have.class', 'active');
        });

        it('should show feedback on wrong answer', () => {
            cy.get('.card.locked').first().click();
            // Click a random option (may be wrong)
            cy.get('.quiz-option').eq(2).click();
            // Either correct or wrong feedback should appear
            cy.get('#quizFeedback').should('not.be.empty');
        });
    });

    describe('Menu', () => {
        beforeEach(() => {
            cy.get('#startGameBtn').click();
        });

        it('should open menu when menu button is clicked', () => {
            cy.get('#menuBtn').click();
            cy.get('#menuModal').should('have.class', 'active');
        });

        it('should close menu when Close button is clicked', () => {
            cy.get('#menuBtn').click();
            cy.get('#closeMenuBtn').click();
            cy.get('#menuModal').should('not.have.class', 'active');
        });

        it('should have sound toggle option', () => {
            cy.get('#menuBtn').click();
            cy.get('#toggleSoundBtn').should('be.visible');
            cy.get('#toggleSoundBtn').click();
            cy.get('#toggleSoundBtn').should('contain', 'OFF');
        });

        it('should have level select option', () => {
            cy.get('#menuBtn').click();
            cy.get('#levelSelectBtn').click();
            cy.get('#levelModal').should('have.class', 'active');
        });

        it('should have accessibility options', () => {
            cy.get('#menuBtn').click();
            cy.get('#highContrastBtn').should('be.visible');
            cy.get('#colorblindBtn').should('be.visible');
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            cy.get('#startGameBtn').click();
        });

        it('should navigate cards with Tab key', () => {
            cy.get('body').tab();
            cy.focused().should('exist');
        });

        it('should close modals with Escape key', () => {
            cy.get('#menuBtn').click();
            cy.get('#menuModal').should('have.class', 'active');
            cy.get('body').type('{esc}');
            cy.get('#menuModal').should('not.have.class', 'active');
        });

        it('should have visible focus indicators', () => {
            cy.get('.card').first().focus();
            cy.get('.card').first().should('have.css', 'outline-style', 'solid');
        });
    });

    describe('Accessibility', () => {
        it('should have ARIA labels on interactive elements', () => {
            cy.get('#menuBtn').should('have.attr', 'aria-label');
            cy.get('#musicToggle').should('have.attr', 'aria-label');
            cy.get('#shareBtn').should('have.attr', 'aria-label');
        });

        it('should have role attributes on modals', () => {
            cy.get('#quizModal').should('have.attr', 'role', 'dialog');
            cy.get('#menuModal').should('have.attr', 'role', 'dialog');
        });

        it('should have focusable cards', () => {
            cy.get('#startGameBtn').click();
            cy.get('.card').each(($card) => {
                cy.wrap($card).should('have.attr', 'tabindex', '0');
            });
        });
    });

    describe('Level Selection', () => {
        it('should allow selecting different levels', () => {
            cy.get('#startGameBtn').click();
            cy.get('#menuBtn').click();
            cy.get('#levelSelectBtn').click();

            // Select Level 2
            cy.get('#levelOptions button').contains('Kings').click();

            // Should show start screen with Level 2 info
            cy.get('#startLevelInfo').should('contain', 'Level 2');
        });
    });

    describe('Responsive Design', () => {
        it('should work on mobile viewport', () => {
            cy.viewport('iphone-x');
            cy.get('#startScreen').should('be.visible');
            cy.get('#startGameBtn').should('be.visible');
            cy.get('#startGameBtn').click();
            cy.get('.card-pool').should('be.visible');
        });

        it('should work on tablet viewport', () => {
            cy.viewport('ipad-2');
            cy.get('#startGameBtn').click();
            cy.get('.timeline').should('be.visible');
        });
    });
});

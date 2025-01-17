const genAlpha = (length = 5) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    return Array(length).fill().map(() => characters[Math.floor(Math.random() * characters.length)]).join('');
};

const testFormOpening = (rowId, formId) => {
    cy.get(`${rowId} > button.icon`).click();
    cy.get(formId).should('be.visible');
    cy.get(`.popup-form${formId} .form-buttons .close-button`).click();
    cy.get(`.popup-form${formId}`).should('not.be.visible');
};

const getVisibleData = () => {
    const data = {};

    cy.get('#givenname-row > button').invoke('text').then(text => data.givenName = text.trim());
    cy.get('#familyname-row > button').invoke('text').then(text => data.familyName = text.trim());
    cy.get('#pronouns-row > button').invoke('text').then(text => data.pronouns = text.trim());
    cy.get('#secondary-email-row > button').invoke('text').then(text => data.secondaryEmail = text.trim());

    return data;
};

const testModification = (formId, cb) => {
    cy.get('.alert-success').invoke('hide').should('not.be.visible');
    cy.get(`.popup-form${formId}`).invoke('show').within(cb);
    cy.get(`.popup-form${formId} .form-buttons input[type="submit"]`).click();
    cy.get(`.popup-form${formId}`).should('not.be.visible');
    cy.get('.alert-success', { timeout: 5000 }).should('be.visible');
};

const fillData = (data) => {
    testModification('#edit-username-form', () => {
        cy.get('#user-givenname-change').clear().type(data.givenName);
        cy.get('#user-familyname-change').clear().type(data.familyName);
    });

    testModification('#edit-pronouns-form', () => {
        cy.get('#user-pronouns-change').clear().as('pronounsInput');
        data.pronouns && cy.get('@pronounsInput').type(data.pronouns);
    });

    testModification('#edit-secondary-email-form', () => {
        cy.get('#user-secondary-email-change')
            .clear()
            .as('secondaryEmailInput');
        data.secondaryEmail &&
            cy.get('@secondaryEmailInput').type(data.secondaryEmail);
    });
};

const newUserData = {
    givenName: genAlpha(),
    familyName: genAlpha(),
    pronouns: genAlpha(),
    secondaryEmail: `${genAlpha()}@example.com`,
};

let priorUserData = {};

describe('Test cases revolving around user profile page', () => {
    beforeEach(() => {
        cy.visit('/user_profile');
        cy.login();
    });

    it('Should show the information rows', () => {
        cy.get('#username-row').should('be.visible');
        cy.get('#givenname-row').should('be.visible');
        cy.get('#familyname-row').should('be.visible');
        cy.get('#pronouns-row').should('be.visible');
        cy.get('#email-row').should('be.visible');
        cy.get('#secondary-email-row').should('be.visible');
        cy.get('#secondary-email-notify-row').should('be.visible');
    });

    // Selenium test_basic_info
    it('Should start with accurate values', () => {
        cy.get('[data-testid="username-row"]').should('contain.text', 'instructor');
        cy.get('[data-testid="givenname-row"]').should('contain.text', 'Quinn');
        cy.get('[data-testid="familyname-row"]').should('contain.text', 'Instructor');
        cy.get('[data-testid="pronouns-row"]').should('contain.text', 'She/Her');
        cy.get('[data-testid="email-row"]').should('contain.text', 'instructor@example.com');
    });

    // Selenium test_time_zone_selection
    it('Time zone selector should work', () => {
        cy.get('[data-testid="time-zone-dropdown"]').should('contain.text', 'NOT_SET/NOT_SET');
        cy.get('[data-testid="time-zone-dropdown"]').select('(UTC-04:00) America/New_York');
        // Since the login success message is still up, we get the next message.
        cy.get('[data-testid="popup-message"]').next().should('contain.text', 'Time-zone updated successfully');
        cy.get('[data-testid="time-zone-dropdown"]').select('NOT_SET/NOT_SET');
    });

    it('Should error then succeed uploading profile photo', () => {
        const filePath = '../more_autograding_examples/image_diff_mirror/submissions/student1.png';
        cy.get('[data-testid="upload-photo-button"]').click();
        cy.get('[data-testid="submit-button"]').click();
        // Since the login success message is still up, we get the next message.
        cy.get('[data-testid="popup-message"]').next().should('contain.text', 'No image uploaded to update the profile photo');
        cy.get('[data-testid="upload-photo-button"]').click();
        cy.get('[data-testid="user-image-button"]').selectFile(filePath);
        cy.get('[data-testid="submit-button"]').click();
        cy.get('[data-testid="popup-message"]').next().next().should('contain.text', 'Profile photo updated successfully!');
    });

    it('Flagging an innapropriate photo', () => {
        // Make sure an image has been uploaded
        const filePath = '../more_autograding_examples/image_diff_mirror/submissions/student1.png';
        cy.get('[data-testid="upload-photo-button"]').click();
        cy.get('[data-testid="user-image-button"]').selectFile(filePath);
        cy.get('[data-testid="submit-button"]').click();
        cy.visit(['sample', 'student_photos']);
        cy.get('.fa-flag').click();
        cy.on('window:confirm', () => {
            return true;
        });

        cy.visit('/user_profile');
        cy.get('[data-flagged="flagged"]').should('contain.text', 'Your preferred image was flagged as inappropriate.');

        // Undo flagging of image
        cy.visit(['sample', 'student_photos']);
        cy.get('.fa-undo').click();
        cy.on('window:confirm', () => {
            return true;
        });
    });

    it('Should open and close the popups', () => {
        cy.get('.popup-form').should('not.be.visible');

        testFormOpening('#givenname-row', '#edit-username-form');
        testFormOpening('#familyname-row', '#edit-username-form');

        testFormOpening('#pronouns-row', '#edit-pronouns-form');

        testFormOpening('#secondary-email-row', '#edit-secondary-email-form');
        testFormOpening('#secondary-email-notify-row', '#edit-secondary-email-form');

        cy.get('.popup-form').should('not.be.visible');
    });

    it('Should test the modifying of the values', () => {
        priorUserData = getVisibleData();

        fillData(newUserData);

        const updatedData = getVisibleData();
        cy.wrap(updatedData).should('deep.equal', newUserData);
    });

    it('Should persist on refresh', () => {
        const userData = getVisibleData();
        cy.wrap(userData).should('deep.equal', newUserData);
    });

    after(() => {
        cy.visit('/user_profile');
        cy.login();

        fillData(priorUserData);

        const revertedData = getVisibleData();
        cy.wrap(revertedData).should('deep.equal', priorUserData);
    });
});

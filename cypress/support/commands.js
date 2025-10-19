Cypress.Commands.add("mockSignupSuccess", () => {
  cy.window().then((win) => {
    if (!win.supabase) {
      cy.log("⚠️ Supabase not found in window yet");
      return;
    }
    cy.stub(win.supabase.auth, "signUp").resolves({
      data: { user: { id: "mock-user-1" } },
      error: null,
    });
  });
});

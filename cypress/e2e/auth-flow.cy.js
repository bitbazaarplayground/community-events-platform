describe("Sign Up", () => {
  it("creates new account", () => {
    cy.visit("http://localhost:5173/");
    cy.contains("Sign In").click();

    cy.contains("Log In").should("exist");
    cy.contains("Sign up").click();
    cy.contains("Sign Up").should("exist");

    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    cy.get("input[placeholder='Email']").type(uniqueEmail);
    cy.get("input[placeholder='Password']").type("Password123!");

    // Click the form submit button
    cy.get('form button[type="submit"]').click();
    cy.wait(500);
    // Debug
    cy.window().then((win) => {
      cy.log("isSignUp value:", win.testDebug?.isSignUp);
    });

    // Check message
    cy.get("[data-testid='auth-message']", { timeout: 10000 })
      .should("exist")
      .and("contain.text", "check your email");
  });
});

describe("Sign Up", () => {
  it("creates new account", () => {
    cy.visit("http://localhost:5173/signup");
    cy.get("input[name='email']").type("testuser@example.com");
    cy.get("input[name='password']").type("Password123!");
    cy.contains("Sign Up").click();
    cy.contains(/check your email/i).should("exist");
  });
});

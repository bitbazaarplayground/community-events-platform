describe("Event interactions", () => {
  it("shows calendar link and signup button", () => {
    cy.visit("http://localhost:5173/browse");
    cy.get("button").contains("See More Events").click({ force: true });
    cy.contains("Add to Google Calendar").should("exist");
    cy.contains(/Join Free|Sign Up/).should("exist");
  });
});

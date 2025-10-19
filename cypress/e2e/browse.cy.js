describe("Browse page search", () => {
  it("allows user to search events", () => {
    cy.visit("http://localhost:5173/browse");
    cy.get("input[placeholder*='Search']").first().type("music");
    cy.wait(1000);
    cy.contains(/featured events/i).should("exist");
  });
});

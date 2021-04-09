export default class GroupModal {
  private openPartialImport = "openPartialImportModal";

  open(name?: string) {
    cy.getId(this.openPartialImport).click();
    return this;
  }
}

const EL_CREATED_BY_PACKAGE_KEY = 'isCreatedByPackage'
const EL_CREATED_BY_PACKAGE_VALUE = '1'

/**
 * Assigns a custom data attribute to a given HTML element to mark it as created by this package.
 *
 * This function modifies the provided HTML element by setting a data attribute, enabling identification
 * of elements that were programmatically created by the package. The attribute key and value are determined
 * by pre-defined constants.
 *
 * @param {HTMLElement} el - The HTML element to which the custom data attribute is applied.
 */
export const markAsCreatedByPackage = (el: HTMLElement) => {
  el.dataset[EL_CREATED_BY_PACKAGE_KEY] = EL_CREATED_BY_PACKAGE_VALUE
}

/**
 * Removes an HTML element if it is marked as created by the package.
 *
 * This function checks the `isCreatedByPackage` dataset of the provided HTML element.
 * If the value is set to '1', the element is removed from the DOM.
 *
 * @param {HTMLElement} el - The HTML element to evaluate and potentially remove.
 */
export const removeCreatedByPackage = (el: HTMLElement) => {
  if (el.dataset[EL_CREATED_BY_PACKAGE_KEY] === EL_CREATED_BY_PACKAGE_VALUE) {
    el.remove()
  }
}

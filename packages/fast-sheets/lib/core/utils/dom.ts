const EL_CREATED_BY_PACKAGE_KEY = 'isCreatedByPackage'
const EL_CREATED_BY_PACKAGE_VALUE = '1'

/** Marks an element as created by this package, so that `removeCreatedByPackage` may remove it. */
export const markAsCreatedByPackage = (el: HTMLElement) => {
  el.dataset[EL_CREATED_BY_PACKAGE_KEY] = EL_CREATED_BY_PACKAGE_VALUE
}

/** Removes an element only if this package created it; elements passed in by the user are kept. */
export const removeCreatedByPackage = (el: HTMLElement) => {
  if (el.dataset[EL_CREATED_BY_PACKAGE_KEY] === EL_CREATED_BY_PACKAGE_VALUE) {
    el.remove()
  }
}

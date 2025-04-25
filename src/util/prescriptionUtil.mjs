/**
 * Fetches the name of the active ingredient in a drug from the RxNorm service.
 *
 * @param {string} rxcui RxNorm id of the drug
 * @returns {Promise<string|null>} name of the active ingredient, null if unsuccessful
 * @see https://www.nlm.nih.gov/research/umls/rxnorm/overview.html
 */
export async function getRxNormInName(rxcui) {
  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allrelated.json`,
    );
    if (response.status === 200) {
      const ingredientNames = (
        await response.json()
      ).allRelatedGroup.conceptGroup
        // Finds active ingredients of the drug
        .filter((item) => {
          return item.tty === "IN";
        })
        // Gets the name of the active ingredient
        .map((item) => {
          return item.conceptProperties[0].name;
        });
      // The majority of tested drugs only has zero or one active ingredient registered
      return ingredientNames[0];
    }
  } catch (error) {
    console.error(`Unable to get ingredient for RxCUI ${rxcui}. Error `, error);
  }
  return null;
}

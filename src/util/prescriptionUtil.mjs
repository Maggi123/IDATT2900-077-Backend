export async function getRxNormInName(rxcui) {
  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allrelated.json`,
    );
    if (response.status === 200) {
      const ingredientNames = (
        await response.json()
      ).allRelatedGroup.conceptGroup
        .filter((item) => {
          return item.tty === "IN";
        })
        .map((item) => {
          return item.conceptProperties[0].name;
        });
      return ingredientNames[0];
    }
  } catch (error) {
    console.error(`Unable to get ingredient for RxCUI ${rxcui}. Error `, error);
  }
  return null;
}

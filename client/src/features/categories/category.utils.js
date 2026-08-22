export function validateAdminCategoryForm(form) {
  const fields = {};

  const name = form.name.trim();

  if (!name) {
    fields.name = 'Category name is required.';
  }

  if (!form.sport) {
    fields.sport = 'Sport is required.';
  }

  return {
    fields,

    normalized: {
      name,

      sport: form.sport,
    },
  };
}

export function getCategorySportLabel(sports, sportValue) {
  return (
    sports.find((sport) => sport.value === sportValue)?.label ?? sportValue
  );
}

# API Spec

standard:
max_item: max item on list = 10_000, internal server constant

page: number, default 1, max 100
limit: number, default 10, max 100
q: string, default: undefined (omitted), maxLength: 1_000 (is used for searching)
sortedBy: string, example: totalAmount,-createdAt (<order><keyToSort><separator = comma>)
fields: string, example: name,age,createdAt,updatedAt,...
filter: string, example: JSON.stringify(filter), where filter is below
(operator: in(contains), nin(not contains), eq(equal to), ne(not equal to), all(match_all_in_array), gt(greater than), gte(greater or equal than), lt(less than), lte(less or equal than))

page \* limit > max_item => throw error 400 - Offset too large, please refine your filter

1.  [
    { key: 'age', value: 30, operator: 'is' },
    { key: 'year', value: [2000, 2001, 2002], operator: 'in' }
    ]
2.  {
    age_eq: 30,
    year_in: [2000, 2001, 2002]
    }
3.  (only pick system pagination fields (page, limit, q, sortedBy, fields), the rests are filter fields)
    ?piState[0]=draft&piState[1]=pending&...

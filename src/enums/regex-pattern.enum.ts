export const RegexPattern = {
  PAGINATE_SORT_QUERY: /^(?:(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))+(?:,(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))*$/,
  ACCOUNT_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/
}
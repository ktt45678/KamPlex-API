export const RegexPattern = {
  PAGINATE_SORT_QUERY: /^(?:(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))+(?:,(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))*$/,
  PAGINATE_SINGLE_SORT_QUERY: /^(?:(?:asc|desc)(?:\([\w\.]+\)))$/,
  ACCOUNT_PASSWORD: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/
}

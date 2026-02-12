/** Enum tương thích schema Post (app chính) */
export const EAssetType = {
  CAR: 'car',
  PROPERTY: 'property',
  EQUIPMENT: 'equipment',
}

export const EPropertyType = {
  APARTMENT: 'apartment',
  VILLA: 'villa',
  HOUSE: 'house',
  LAND: 'land',
}

export const EPropertyLegalStatus = {
  NOT_YET_CHECKED: 'not_yet_checked',
  CHECKING: 'checking',
  LEGAL: 'legal',
  ILLEGAL: 'illegal',
}

export const EPostStatus = {
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
}

export const EPriceUnit = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  HALF_YEAR: 'half_year',
  YEAR: 'year',
}

export const POST_MODEL_NAME = 'post'

export const BASE_URL = 'https://bds.com.vn'
export const LIST_PATH = '/cho-thue-nha-dat'
export const MUA_BAN_LIST_PATH = '/mua-ban-nha-dat'
export const MAX_LIST_PAGES = 5
export const LIST_PAGE_DELAY_MS = 300
export const DETAIL_FETCH_DELAY_MS = 800

import { NotFoundError } from '@/core/helpers'
import { pick } from '@/core/utils'

import { posts } from '../mock-post'

export class PostService {
  createOne(dto) {
    const newPost = {
      ...dto,
      id: posts.length + 1,
      createdAt: new Date(),
    }
    posts.push(newPost)

    return newPost
  }

  updateOne(queryDto, bodyDto) {
    const { id } = queryDto
    const postIndex = posts.findIndex(post => post.id === id)
    if (postIndex === -1) {
      throw new NotFoundError('Post', { id })
    }

    const updatedPost = { ...posts[postIndex], ...bodyDto }
    posts[postIndex] = updatedPost

    return updatedPost
  }

  getTotal(_queryDto) {
    return posts.length
  }

  getList(queryDto) {
    const { page, limit, sortBy, fields } = queryDto

    let result = posts
    if (sortBy) {
      result = result.sort((a, b) => {
        const aValue = a[sortBy]
        const bValue = b[sortBy]

        if (sortBy.startsWith('-')) {
          return bValue - aValue
        }

        return aValue - bValue
      })
    }

    return result.slice((page - 1) * limit, page * limit).map(post => {
      if (fields) {
        return pick(post, fields)
      }

      return post
    })
  }

  getDetail(queryDto) {
    const { id } = queryDto
    const post = posts.find(post => post.id === id)
    if (!post) {
      throw new NotFoundError('Post', { id })
    }

    return post
  }

  deleteOne(queryDto) {
    const { id } = queryDto
    const postIndex = posts.findIndex(post => post.id === id)
    if (postIndex === -1) {
      throw new NotFoundError('Post', { id })
    }

    const deletedPost = posts.splice(postIndex, 1)[0]
    return deletedPost
  }
}

export const postService = new PostService()

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
}

export const postService = new PostService()

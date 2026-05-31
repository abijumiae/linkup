import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Req() req: { user: SafeUser }, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
  }

  @Get('feed')
  getFeed(
    @Req() req: { user: SafeUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.getFeed(req.user.id, { page, limit });
  }

  @Get('me')
  getMyPosts(@Req() req: { user: SafeUser }) {
    return this.postsService.getMyPosts(req.user.id);
  }

  @Get('saved')
  getSavedPosts(@Req() req: { user: SafeUser }) {
    return this.postsService.getSavedPosts(req.user.id);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.deleteComment(commentId, req.user.id);
  }

  @Post(':postId/like')
  toggleLike(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.toggleLike(postId, req.user.id);
  }

  @Post(':postId/comments')
  createComment(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(postId, req.user.id, dto);
  }

  @Get(':postId/comments')
  getComments(@Param('postId') postId: string) {
    return this.postsService.getComments(postId);
  }

  @Post(':postId/save')
  toggleSave(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.toggleSave(postId, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.postsService.delete(id, req.user.id);
  }
}

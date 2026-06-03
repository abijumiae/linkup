import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Req() req: { user: SafeUser }, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
  }

  /** Alias for feed — GET /posts?page=&limit= */
  @Get()
  getPosts(
    @Req() req: { user: SafeUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.getFeed(req.user.id, { page, limit });
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
  deleteCommentLegacy(
    @Param('commentId') commentId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.deleteCommentById(commentId, req.user.id);
  }

  @Post(':postId/like')
  toggleLike(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.toggleLike(postId, req.user.id);
  }

  /** Boost alias for like */
  @Post(':postId/boost')
  boostPost(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.toggleLike(postId, req.user.id);
  }

  @Delete(':postId/boost')
  removeBoost(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.removeBoost(postId, req.user.id);
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

  @Delete(':postId/comments/:commentId')
  deleteComment(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.deleteComment(postId, commentId, req.user.id);
  }

  @Post(':postId/save')
  toggleSave(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.toggleSave(postId, req.user.id);
  }

  @Delete(':postId/save')
  removeSave(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.removeSave(postId, req.user.id);
  }

  @Get(':id')
  getPost(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.postsService.getPostById(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, req.user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.postsService.delete(id, req.user);
  }
}

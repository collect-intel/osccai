# Admin User Guide

## Overview

The CommunityModels platform includes an administrative interface that allows platform administrators to:

1. View and access all community models across the platform
2. Debug issues by impersonating or viewing the experience of specific CommunityModelOwners
3. Moderate content and manage users when necessary
4. Monitor platform usage and health

## Accessing Admin Features

Admin features are only available to users with the `isAdmin` flag set to `true` in their `CommunityModelOwner` record. This can only be set directly in the database by a system administrator.

### Admin Dashboard

The admin dashboard is available at `/admin`. From here, you can:

- View a list of all community models
- Click on a model to view its details
- Edit any model by clicking the "Edit" button

### Viewing Model Details

When viewing a model's details at `/admin/models/[id]`, you can see:

- Basic model information (name, goal, bio, etc.)
- Owner information
- Polls associated with the model
- API keys for the model

### Editing Models

When editing a model as an admin, you'll see an "Admin Mode" indicator and an impersonation banner showing which user's model you're editing. This helps prevent confusion about whose model you're modifying.

To edit a model, click the "Edit" button from either the admin dashboard or the model details page. This will take you to the standard model editing flow, but with admin privileges.

## Admin Indicators

When using the platform as an admin, you'll see visual indicators to remind you that you're in admin mode:

1. A red "Admin Mode" badge in the bottom-right corner of the screen
2. When editing a user's model, a yellow impersonation banner at the top of the screen

## Best Practices

1. **Use Admin Powers Responsibly**: Admin access should be used only when necessary for platform maintenance, user support, or content moderation.

2. **Document Changes**: When making changes to a user's model, document what was changed and why.

3. **Respect User Privacy**: While you have access to all models, respect user privacy and only access models when necessary.

4. **Be Careful with Edits**: Changes made as an admin are indistinguishable from changes made by the model owner. Be careful not to make changes that would confuse the owner.

## Troubleshooting

### Common Issues

1. **Can't access admin dashboard**: Ensure your user account has the `isAdmin` flag set to `true` in the database.

2. **Changes not saving**: Ensure you have proper permissions and that the database is accessible.

3. **UI issues in admin mode**: Clear your browser cache and try again.

### Getting Help

If you encounter issues with the admin interface, contact the platform development team for assistance. 
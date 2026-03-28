# Gallery Feature Implementation TODO

## Steps

- [ ] 1. Create `server/routes/gallery.js` - Public gallery API routes
- [ ] 2. Modify `server/index.js` - Add DB tables, import gallery router, add /gallery to CLIENT_ROUTES
- [ ] 3. Modify `server/routes/admin.js` - Add gallery admin routes (pending, approve, reject, rename, delete)
- [ ] 4. Create `client/src/components/GalleryPage.jsx` - Full-screen gallery page
- [ ] 5. Create `client/src/styles/gallery.scss` - Gallery styles
- [ ] 6. Modify `client/src/store/adminState.js` - Add gallery pending state/methods
- [ ] 7. Modify `client/src/store/userState.js` - Add galleryDrawings + fetchGalleryDrawings()
- [ ] 8. Modify `client/src/components/TopMenu.jsx` - Add gallery button (desktop) + add-to-gallery button
- [ ] 9. Modify `client/src/components/Canvas.jsx` - Add gallery button to mobile section
- [ ] 10. Modify `client/src/components/AdminPage.jsx` - Add gallery tab + renderGallery()
- [ ] 11. Modify `client/src/components/ProfilePage.jsx` - Add "Рисунки в галерее" section
- [ ] 12. Modify `client/src/App.jsx` - Import gallery.scss, add /gallery route, add to hideGlobalUI
- [ ] 13. Modify `client/src/styles/canvas.scss` - Reduce mobile button spacing for 3 buttons

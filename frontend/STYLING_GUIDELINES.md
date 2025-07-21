# Build Watch Styling Guidelines

## 🎨 Consistent Styling Approach

### ✅ DO: Use Astro + Tailwind CSS Integration
All pages MUST use the proper Astro + Tailwind CSS integration:

```astro
---
import "../styles/global.css";
---
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title</title>
  </head>
  <body>
    <!-- Your content here -->
  </body>
</html>
```

### ❌ DON'T: Use CDN Links
Never use CDN links for Tailwind CSS in Astro pages:

```astro
<!-- ❌ WRONG - This causes styling conflicts -->
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
```

## 🔧 Project Structure

### Tailwind Configuration
- **File**: `tailwind.config.js` (v3.x for Astro compatibility)
- **CSS Import**: `src/styles/global.css` contains `@tailwind` directives
- **Integration**: `@astrojs/tailwind` in `astro.config.mjs`

### Color Palette
- **Primary Red**: `#FE5353` and `#EB3C3C`
- **Secondary**: `#EBACAC`, `#FF8787`
- **Text**: `#7A1F1F` (dark red), `#222` (dark gray)
- **Background**: Gradient from `#EB3C3C` to white

## 📁 File Organization

### Pages
- All pages in `src/pages/` use Astro components
- Consistent import of `../styles/global.css`
- No raw HTML files with CDN links

### Components
- Reusable components in `src/components/`
- Use Tailwind classes for styling
- Maintain consistent spacing and typography

## 🚨 Common Issues & Solutions

### Issue: Pages Revert to Unstyled After Navigation
**Cause**: Mixing CDN Tailwind with Astro Tailwind integration
**Solution**: Ensure all pages use `import "../styles/global.css"`

### Issue: Inconsistent Font Loading
**Cause**: Missing or inconsistent Google Fonts imports
**Solution**: Use the Layout component or consistent font imports

### Issue: Styling Conflicts Between Pages
**Cause**: Different styling approaches on different pages
**Solution**: Standardize all pages to use the same approach

## 🎯 Best Practices

1. **Always import global CSS**: Every page should start with `import "../styles/global.css"`
2. **Use consistent color variables**: Reference the color palette above
3. **Maintain responsive design**: Use Tailwind's responsive prefixes
4. **Test navigation**: Always test page-to-page navigation for styling consistency
5. **Use semantic HTML**: Combine with Tailwind for accessibility

## 🔍 Testing Checklist

Before deploying, ensure:
- [ ] All pages load with proper styling
- [ ] Navigation between pages maintains styling
- [ ] No console errors related to CSS
- [ ] Responsive design works on all screen sizes
- [ ] Fonts load consistently across all pages

## 🛠️ Troubleshooting

### If styling breaks:
1. Check that `import "../styles/global.css"` is present
2. Verify no CDN links are being used
3. Clear browser cache and reload
4. Restart the dev server if needed

### If fonts don't load:
1. Ensure Google Fonts link is present in head
2. Check network tab for font loading errors
3. Verify font-family classes are applied correctly

---

**Remember**: Consistency is key! All pages must follow the same styling approach to prevent conflicts. 
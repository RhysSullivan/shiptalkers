import { Profile } from "./profile";

export default async function Page(props: {
  searchParams: {
    github: string;
    twitter: string;
  } | {
    name: string;
  };
}) {
  if ('name' in props.searchParams) {
    return <Profile 
      githubName={props.searchParams.name} 
      twitterName={props.searchParams.name}
     />;
  }
  return (
    <Profile
      githubName={props.searchParams.github}
      twitterName={props.searchParams.twitter}
    />
  );
}

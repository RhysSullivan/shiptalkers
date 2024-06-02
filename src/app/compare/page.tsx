import { Profile } from "./profile";

export default async function Page(props: {
  searchParams: {
    github: string;
    twitter: string;
  };
}) {
  return (
    <Profile
      githubName={props.searchParams.github}
      twitterName={props.searchParams.twitter}
    />
  );
}
